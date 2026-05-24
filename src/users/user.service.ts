import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async create(data: Partial<User>): Promise<UserDocument> {
        const user = new this.userModel(data)
        return user.save()
    }
    async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
        return await this.userModel.findOne({ email }).select('+password').exec()
    }

    async findByUsernameOREmail(
        username: string,
        email: string
    ): Promise<UserDocument | null> {
        return await this.userModel.findOne({ $or: [{ username }, { email }] }).exec()
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel.findById(id).exec()
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateProfile(id: string, data: Partial<User>): Promise<UserDocument> {
        const user = await this.userModel
          .findByIdAndUpdate(id, data, { new: true, runValidators: true })
          .exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
      }
    
      async setLastLogin(id: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(id, { lastLogin: new Date() }).exec();
      }
}